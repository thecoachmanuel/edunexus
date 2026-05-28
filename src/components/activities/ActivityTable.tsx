"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import CustomPagination from "@/components/global/CustomPagination";
import { format } from "date-fns";

export interface Activity {
  _id: string;
  user: {
    name: string;
    email: string;
    role: string;
  };
  action: string;
  details?: string;
  createdAt: string;
}

interface Props {
  data: Activity[];
  loading: boolean;
  page: number;
  setPage: (val: number) => void;
  totalPages: number;
}

export function ActivityTable({ data, loading, page, setPage, totalPages }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 border rounded-md">
        <p className="text-muted-foreground">No activities found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Date & Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((log) => (
              <TableRow key={log._id}>
                <TableCell className="font-medium">
                  {log.user ? log.user.name : "System"}
                </TableCell>
                <TableCell className="capitalize">
                  {log.user ? log.user.role : "System"}
                </TableCell>
                <TableCell>{log.action}</TableCell>
                <TableCell>
                  {format(new Date(log.createdAt), "MMM d, yyyy - h:mm a")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <CustomPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
